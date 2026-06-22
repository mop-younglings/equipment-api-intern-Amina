using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using EquipmentApi.Auth;
using EquipmentApi.Authorization;
using EquipmentApi.Configuration;
using EquipmentApi.Data;
using EquipmentApi.Enums;
using EquipmentApi.Exceptions;
using EquipmentApi.Json;
using EquipmentApi.Middleware;
using EquipmentApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

var databaseSettings = builder.Configuration.GetDatabaseSettings();
var authSettings = builder.Configuration.GetAuthSettings();
var appSettings = builder.Configuration.GetAppSettings();

builder.WebHost.UseUrls($"http://0.0.0.0:{appSettings.Port}");

builder.Services.AddSingleton(databaseSettings);
builder.Services.AddSingleton(authSettings);
builder.Services.AddSingleton(appSettings);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(databaseSettings.ConnectionString);
    dataSourceBuilder.MapEnum<EmployeeRole>("employee_role_enum");
    dataSourceBuilder.MapEnum<AccountStatus>("account_status_enum");
    dataSourceBuilder.MapEnum<EquipmentAssetStatus>("equipment_asset_status_enum");
    dataSourceBuilder.MapEnum<RequestType>("request_type_enum");
    dataSourceBuilder.MapEnum<RequestStatus>("request_status_enum");
    dataSourceBuilder.MapEnum<ApprovalRole>("approval_role_enum");
    dataSourceBuilder.MapEnum<ApprovalStepStatus>("approval_step_status_enum");
    dataSourceBuilder.MapEnum<EquipmentAssignmentStatus>("equipment_assignment_status_enum");
    dataSourceBuilder.MapEnum<NotificationType>("notification_type_enum");
    var dataSource = dataSourceBuilder.Build();
    options.UseNpgsql(dataSource);
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authSettings.JwtSecret)),
            NameClaimType = JwtRegisteredClaimNames.Sub,
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var authService = context.HttpContext.RequestServices.GetRequiredService<AuthService>();
                var sub = context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                    ?? context.Principal?.FindFirstValue("sub");
                var email = context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Email)
                    ?? context.Principal?.FindFirstValue("email");
                var roleValue = context.Principal?.FindFirstValue("role");

                if (sub is null || email is null || roleValue is null)
                {
                    context.Fail("Invalid or expired token");
                    return;
                }

                try
                {
                    var payload = new AuthJwtPayload
                    {
                        Sub = Guid.Parse(sub),
                        Email = email,
                        Role = EnumJsonHelper.FromEnumMemberValue<EmployeeRole>(roleValue),
                    };

                    var user = await authService.ValidateJwtPayloadAsync(payload, context.HttpContext.RequestAborted);
                    context.Principal!.Identities.First().AddClaim(
                        new System.Security.Claims.Claim("validated", "true"));
                    context.HttpContext.Items[nameof(AuthenticatedUser)] = user;
                }
                catch (UnauthorizedException)
                {
                    context.Fail("Invalid or expired token");
                }
            },
        };
    });

builder.Services.AddAuthorization(options =>
{
    foreach (EmployeeRole role in Enum.GetValues<EmployeeRole>())
    {
        options.AddPolicy(
            $"{MinRoleRequirement.PolicyPrefix}{role}",
            policy => policy.AddRequirements(new MinRoleRequirement(role)));
    }
});

builder.Services.AddSingleton<IAuthorizationHandler, MinRoleAuthorizationHandler>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));
});

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.ConfigureApiJson())
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = InvalidModelStateResponseFactory.Create;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Equipment Request API",
        Description = "API for managing equipment requests, approvals, and employees",
        Version = "1.0",
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer",
                },
            },
            Array.Empty<string>()
        },
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(appSettings.CorsOrigin)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddScoped<AccessControlService>();
builder.Services.AddScoped<RefreshTokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ApprovalWorkflowService>();
builder.Services.AddScoped<ApprovalService>();
builder.Services.AddScoped<RequestService>();
builder.Services.AddScoped<EquipmentAssignmentService>();
builder.Services.AddScoped<EquipmentAssetService>();
builder.Services.AddScoped<EquipmentModelService>();
builder.Services.AddScoped<CatalogService>();
builder.Services.AddScoped<EquipmentCategoryService>();
builder.Services.AddScoped<DepartmentService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ProcurementService>();
builder.Services.AddScoped<AdminService>();

var app = builder.Build();

await DatabaseMigrator.RunAsync(app.Services, databaseSettings);

if (args.Contains("seed", StringComparer.OrdinalIgnoreCase))
{
    await DatabaseSeeder.RunAsync(app.Services);
    return;
}

app.UseExceptionHandling();
app.UseRateLimiter();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.UseSwagger(options => options.RouteTemplate = "api/swagger/{documentName}/swagger.json");
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/api/swagger/v1/swagger.json", "Equipment Request API");
    options.RoutePrefix = "api";
});

app.MapGet("/api-json", () => Results.Redirect("/api/swagger/v1/swagger.json"));

app.MapControllers();

app.Run();

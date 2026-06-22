using System.Text.Json;
using EquipmentApi.Exceptions;
using EquipmentApi.Json;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentApi.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(context, exception);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message, error) = ResolveException(exception);

        if (statusCode >= 500)
        {
            _logger.LogError(
                exception,
                "{Method} {Path}",
                context.Request.Method,
                context.Request.Path);
        }

        var body = new
        {
            statusCode,
            message,
            error,
            path = context.Request.Path.Value ?? string.Empty,
            timestamp = DateTime.UtcNow.ToString("o"),
        };

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
    }

    private static (int StatusCode, object Message, string Error) ResolveException(Exception exception)
    {
        if (exception is AppException appException)
        {
            return (appException.StatusCode, appException.Message, appException.Error);
        }

        return (500, "Internal server error", "Internal Server Error");
    }

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions();
        options.ConfigureApiJson();
        return options;
    }
}

public static class ExceptionHandlingMiddlewareExtensions
{
    public static IApplicationBuilder UseExceptionHandling(this IApplicationBuilder app)
    {
        return app.UseMiddleware<ExceptionHandlingMiddleware>();
    }
}

public sealed class InvalidModelStateResponseFactory
{
    public static IActionResult Create(ActionContext context)
    {
        var errors = context.ModelState
            .Where(entry => entry.Value?.Errors.Count > 0)
            .SelectMany(entry => entry.Value!.Errors.Select(error =>
                string.IsNullOrWhiteSpace(error.ErrorMessage)
                    ? error.Exception?.Message ?? "Validation failed"
                    : error.ErrorMessage))
            .ToArray();

        var body = new
        {
            statusCode = 400,
            message = (object)(errors.Length == 1 ? errors[0] : errors),
            error = "Bad Request",
            path = context.HttpContext.Request.Path.Value ?? string.Empty,
            timestamp = DateTime.UtcNow.ToString("o"),
        };

        return new BadRequestObjectResult(body);
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EquipmentApi.Auth;
using EquipmentApi.Configuration;
using EquipmentApi.Data;
using EquipmentApi.Dtos;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using EquipmentApi.Exceptions;
using EquipmentApi.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace EquipmentApi.Services;

public class AuthService
{
    private const int SaltRounds = 10;

    private readonly AppDbContext _db;
    private readonly AuthSettings _authSettings;
    private readonly RefreshTokenService _refreshTokenService;

    public AuthService(
        AppDbContext db,
        AuthSettings authSettings,
        RefreshTokenService refreshTokenService)
    {
        _db = db;
        _authSettings = authSettings;
        _refreshTokenService = refreshTokenService;
    }

    public async Task<Employee> RegisterAsync(RegisterDto registerDto, CancellationToken cancellationToken = default)
    {
        var existing = await _db.Employees
            .AnyAsync(e => e.Email == registerDto.Email, cancellationToken);

        if (existing)
        {
            throw new ConflictException("Email already registered");
        }

        Department? department = null;
        if (registerDto.DepartmentId is not null)
        {
            department = await _db.Departments
                .FirstOrDefaultAsync(d => d.Id == registerDto.DepartmentId, cancellationToken);
        }

        var employee = new Employee
        {
            FirstName = registerDto.FirstName,
            LastName = registerDto.LastName,
            Email = registerDto.Email,
            Password = BCrypt.Net.BCrypt.HashPassword(registerDto.Password, SaltRounds),
            Role = EmployeeRole.Employee,
            AccountStatus = AccountStatus.Active,
            DepartmentId = department?.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Employees.Add(employee);
        await _db.SaveChangesAsync(cancellationToken);

        employee.Department = department;
        return employee;
    }

    public async Task<AuthenticatedUser> ValidateJwtPayloadAsync(
        AuthJwtPayload payload,
        CancellationToken cancellationToken = default)
    {
        var employee = await _db.Employees
            .FirstOrDefaultAsync(e => e.Id == payload.Sub, cancellationToken);

        if (employee is null || employee.AccountStatus != AccountStatus.Active)
        {
            throw new UnauthorizedException("Invalid or expired token");
        }

        return new AuthenticatedUser
        {
            Id = employee.Id,
            Email = employee.Email,
            Role = employee.Role,
        };
    }

    public async Task<Employee> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var employee = await _db.Employees
            .Include(e => e.Department!)
                .ThenInclude(d => d.DirectManager)
            .FirstOrDefaultAsync(e => e.Id == userId, cancellationToken);

        if (employee is null)
        {
            throw new UnauthorizedException("User not found");
        }

        return employee;
    }

    public async Task<AuthTokenResponse> LoginAsync(LoginDto loginDto, CancellationToken cancellationToken = default)
    {
        var employee = await AuthenticateCredentialsAsync(loginDto, cancellationToken);
        return await IssueTokenPairAsync(employee, cancellationToken);
    }

    public async Task<AuthTokenResponse> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var storedToken = await _refreshTokenService.ValidateTokenAsync(refreshToken, cancellationToken);
        var employee = storedToken.Employee;

        if (employee.AccountStatus != AccountStatus.Active)
        {
            await _refreshTokenService.RevokeTokenAsync(refreshToken, cancellationToken);
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        await _refreshTokenService.RevokeTokenAsync(refreshToken, cancellationToken);
        return await IssueTokenPairAsync(employee, cancellationToken);
    }

    public Task LogoutAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        return _refreshTokenService.RevokeTokenAsync(refreshToken, cancellationToken);
    }

    public Task RevokeAllSessionsAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        return _refreshTokenService.RevokeAllForEmployeeAsync(employeeId, cancellationToken);
    }

    private async Task<Employee> AuthenticateCredentialsAsync(
        LoginDto loginDto,
        CancellationToken cancellationToken)
    {
        var employee = await _db.Employees
            .FirstOrDefaultAsync(e => e.Email == loginDto.Email, cancellationToken);

        if (employee is null || employee.AccountStatus != AccountStatus.Active)
        {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!BCrypt.Net.BCrypt.Verify(loginDto.Password, employee.Password))
        {
            throw new UnauthorizedException("Invalid email or password");
        }

        return employee;
    }

    private async Task<AuthTokenResponse> IssueTokenPairAsync(
        Employee employee,
        CancellationToken cancellationToken)
    {
        var accessToken = GenerateAccessToken(employee);
        var refreshToken = await _refreshTokenService.IssueForEmployeeAsync(employee, cancellationToken);

        return new AuthTokenResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
        };
    }

    private string GenerateAccessToken(Employee employee)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, employee.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, employee.Email),
            new Claim("role", EnumJsonHelper.ToEnumMemberValue(employee.Role)),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_authSettings.JwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = ParseExpiry(_authSettings.JwtExpiresIn);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: expires,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static DateTime ParseExpiry(string value)
    {
        var match = System.Text.RegularExpressions.Regex.Match(value.Trim(), @"^(\d+)([smhd])$");
        if (!match.Success)
        {
            return DateTime.UtcNow.AddMinutes(15);
        }

        var amount = int.Parse(match.Groups[1].Value);
        var unit = match.Groups[2].Value;
        return unit switch
        {
            "s" => DateTime.UtcNow.AddSeconds(amount),
            "m" => DateTime.UtcNow.AddMinutes(amount),
            "h" => DateTime.UtcNow.AddHours(amount),
            "d" => DateTime.UtcNow.AddDays(amount),
            _ => DateTime.UtcNow.AddMinutes(15),
        };
    }
}

using System.Security.Cryptography;
using System.Text;
using EquipmentApi.Configuration;
using EquipmentApi.Data;
using EquipmentApi.Entities;
using EquipmentApi.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Services;

public class RefreshTokenService
{
    private readonly AppDbContext _db;
    private readonly AuthSettings _authSettings;

    public RefreshTokenService(AppDbContext db, AuthSettings authSettings)
    {
        _db = db;
        _authSettings = authSettings;
    }

    public async Task<string> IssueForEmployeeAsync(Employee employee, CancellationToken cancellationToken = default)
    {
        var token = GenerateToken();
        var record = new RefreshToken
        {
            EmployeeId = employee.Id,
            TokenHash = HashToken(token),
            ExpiresAt = GetExpiresAt(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.RefreshTokens.Add(record);
        await _db.SaveChangesAsync(cancellationToken);
        return token;
    }

    public async Task<RefreshToken> ValidateTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        var record = await _db.RefreshTokens
            .Include(t => t.Employee)
            .FirstOrDefaultAsync(
                t => t.TokenHash == HashToken(token)
                    && t.RevokedAt == null
                    && t.ExpiresAt > DateTime.UtcNow,
                cancellationToken);

        if (record is null)
        {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        return record;
    }

    public async Task RevokeTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        var record = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == HashToken(token), cancellationToken);

        if (record is null || record.RevokedAt is not null)
        {
            return;
        }

        record.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task RevokeAllForEmployeeAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        var tokens = await _db.RefreshTokens
            .Where(t => t.EmployeeId == employeeId && t.RevokedAt == null)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var token in tokens)
        {
            token.RevokedAt = now;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static string GenerateToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(48))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private DateTime GetExpiresAt()
    {
        return ParseExpiry(_authSettings.JwtRefreshExpiresIn);
    }

    private static DateTime ParseExpiry(string value)
    {
        var match = System.Text.RegularExpressions.Regex.Match(value.Trim(), @"^(\d+)([smhd])$");
        if (!match.Success)
        {
            return DateTime.UtcNow.AddDays(7);
        }

        var amount = int.Parse(match.Groups[1].Value);
        var unit = match.Groups[2].Value;
        var multiplier = unit switch
        {
            "s" => TimeSpan.FromSeconds(amount),
            "m" => TimeSpan.FromMinutes(amount),
            "h" => TimeSpan.FromHours(amount),
            "d" => TimeSpan.FromDays(amount),
            _ => TimeSpan.FromDays(7),
        };

        return DateTime.UtcNow.Add(multiplier);
    }
}

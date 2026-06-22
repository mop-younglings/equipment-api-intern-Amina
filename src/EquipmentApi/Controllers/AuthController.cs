using EquipmentApi.Auth;
using EquipmentApi.Dtos;
using EquipmentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EquipmentApi.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public Task<Entities.Employee> Register([FromBody] RegisterDto dto, CancellationToken cancellationToken) =>
        _authService.RegisterAsync(dto, cancellationToken);

    [HttpPost("login")]
    public Task<AuthTokenResponse> Login([FromBody] LoginDto dto, CancellationToken cancellationToken) =>
        _authService.LoginAsync(dto, cancellationToken);

    [HttpPost("refresh")]
    public Task<AuthTokenResponse> Refresh([FromBody] RefreshTokenDto dto, CancellationToken cancellationToken) =>
        _authService.RefreshAsync(dto.RefreshToken, cancellationToken);

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenDto dto, CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(dto.RefreshToken, cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public Task<Entities.Employee> Me(CancellationToken cancellationToken) =>
        _authService.GetProfileAsync(User.GetAuthenticatedUser().Id, cancellationToken);
}

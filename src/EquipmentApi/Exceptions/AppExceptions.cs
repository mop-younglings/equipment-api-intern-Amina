namespace EquipmentApi.Exceptions;

public class AppException : Exception
{
    public int StatusCode { get; }
    public string Error { get; }

    public AppException(int statusCode, string message, string error)
        : base(message)
    {
        StatusCode = statusCode;
        Error = error;
    }
}

public sealed class BadRequestException : AppException
{
    public BadRequestException(string message) : base(400, message, "Bad Request") { }
}

public sealed class UnauthorizedException : AppException
{
    public UnauthorizedException(string message) : base(401, message, "Unauthorized") { }
}

public sealed class ForbiddenException : AppException
{
    public ForbiddenException(string message) : base(403, message, "Forbidden") { }
}

public sealed class NotFoundException : AppException
{
    public NotFoundException(string message) : base(404, message, "Not Found") { }
}

public sealed class ConflictException : AppException
{
    public ConflictException(string message) : base(409, message, "Conflict") { }
}

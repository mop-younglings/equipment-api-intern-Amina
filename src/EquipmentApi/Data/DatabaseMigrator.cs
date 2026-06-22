using System.Reflection;
using EquipmentApi.Configuration;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Data;

public static class DatabaseMigrator
{
    public static async Task RunAsync(
        IServiceProvider services,
        DatabaseSettings settings,
        CancellationToken cancellationToken = default)
    {
        if (!settings.RunMigrations)
        {
            return;
        }

        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (!await db.Database.CanConnectAsync(cancellationToken))
        {
            throw new InvalidOperationException("Unable to connect to the database.");
        }

        if (await EmployeesTableExistsAsync(db, cancellationToken))
        {
            return;
        }

        var assembly = Assembly.GetExecutingAssembly();
        var sqlFiles = assembly.GetManifestResourceNames()
            .Where(name => name.EndsWith(".sql", StringComparison.OrdinalIgnoreCase))
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToList();

        foreach (var resourceName in sqlFiles)
        {
            await using var stream = assembly.GetManifestResourceStream(resourceName)
                ?? throw new InvalidOperationException($"Unable to load embedded SQL resource '{resourceName}'.");
            using var reader = new StreamReader(stream);
            var sql = await reader.ReadToEndAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(sql))
            {
                await db.Database.ExecuteSqlRawAsync(sql, cancellationToken);
            }
        }
    }

    private static async Task<bool> EmployeesTableExistsAsync(
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        await using var command = db.Database.GetDbConnection().CreateCommand();
        command.CommandText = """
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_schema = 'public'
                AND table_name = 'employees'
            );
            """;

        await db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result is bool exists && exists;
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }
}

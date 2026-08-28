using ContactsManager.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ContactsManager.Api.Startup;

internal static class TestSupportEndpoints
{
    internal const string TestEnvironment = "Test";

    /// <summary>
    /// Truncate and reseed, so an end-to-end spec starts from a known database. Registered only under
    /// the Test environment — anywhere else the route simply does not exist.
    /// </summary>
    internal static void MapTestSupportEndpoints(this WebApplication app)
    {
        if (!app.Environment.IsEnvironment(TestEnvironment))
        {
            return;
        }

        app.MapPost("/api/test/reset", async (
            ContactsDbContext context,
            TimeProvider clock,
            CancellationToken cancellationToken) =>
        {
            await context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE contacts", cancellationToken);
            await ContactSeeder.SeedAsync(context, clock, cancellationToken);
            return Results.Ok(new { reseeded = true });
        });
    }
}

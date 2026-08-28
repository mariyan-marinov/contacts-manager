using ContactsManager.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ContactsManager.Api.Startup;

internal static class DatabaseStartup
{
    /// <summary>
    /// Only outside Production: a real deployment applies migrations as a deliberate step rather
    /// than as a side effect of a process starting.
    /// </summary>
    internal static async Task MigrateAndSeedAsync(this WebApplication app)
    {
        if (app.Environment.IsProduction())
        {
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ContactsDbContext>();
        var clock = scope.ServiceProvider.GetRequiredService<TimeProvider>();

        await context.Database.MigrateAsync();
        await ContactSeeder.SeedAsync(context, clock);
    }
}

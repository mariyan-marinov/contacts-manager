using ContactsManager.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ContactsManager.Api.Startup;

internal static class DatabaseStartup
{
    /// <summary>
    /// Development and Test only: a real deployment applies migrations as a deliberate step rather
    /// than as a side effect of a process starting.
    /// </summary>
    internal static async Task MigrateAndSeedAsync(this WebApplication app)
    {
        var eligible = app.Environment.IsDevelopment()
            || app.Environment.IsEnvironment(TestSupportEndpoints.TestEnvironment);

        if (!eligible)
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

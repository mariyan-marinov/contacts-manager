using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging;

namespace ContactsManager.Api.Tests.Support;

/// <summary>
/// Boots the real API against the Compose database. Development is the environment that applies
/// migrations and seeds, which is what these tests expect to find.
/// </summary>
internal sealed class ContactsApiFactory : WebApplicationFactory<Program>
{
    internal SqlCapturingProvider CapturedSql { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureLogging(logging =>
        {
            logging.SetMinimumLevel(LogLevel.Information);
            logging.AddProvider(CapturedSql);
        });
    }
}

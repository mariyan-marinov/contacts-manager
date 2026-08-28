using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging;

namespace ContactsManager.Api.Tests.Support;

/// <summary>
/// Boots the real API against the Compose database. Test is the environment these run in: it applies
/// migrations, seeds, and is the only one where the reset endpoint exists.
/// </summary>
internal sealed class ContactsApiFactory(string environment) : WebApplicationFactory<Program>
{
    internal ContactsApiFactory()
        : this("Test")
    {
    }

    internal SqlCapturingProvider CapturedSql { get; } = new();

    /// <summary>A client talking to a freshly reseeded database.</summary>
    internal async Task<HttpClient> CreateResetClientAsync()
    {
        var client = CreateClient();
        var response = await client.PostAsync("/api/test/reset", content: null);
        response.EnsureSuccessStatusCode();
        return client;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environment);
        builder.ConfigureLogging(logging =>
        {
            logging.SetMinimumLevel(LogLevel.Information);
            logging.AddProvider(CapturedSql);
        });
    }
}

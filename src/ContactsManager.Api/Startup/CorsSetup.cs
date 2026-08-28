namespace ContactsManager.Api.Startup;

internal static class CorsSetup
{
    private const string ConfigurationKey = "Cors:AllowedOrigins";

    /// <summary>
    /// Only the origins named in configuration. In development that is the Angular dev server, and
    /// even that matters only when the frontend is reached directly rather than through its proxy.
    /// </summary>
    internal static IServiceCollection AddConfiguredCors(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var origins = configuration.GetSection(ConfigurationKey).Get<string[]>() ?? [];

        return services.AddCors(options => options.AddDefaultPolicy(policy =>
        {
            if (origins.Length == 0)
            {
                return;
            }

            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
        }));
    }
}

using ContactsManager.Application.Abstractions;
using ContactsManager.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ContactsManager.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    /// <summary>
    /// One <see cref="ContactsDbContext"/> per request, handed out under three names: the repository
    /// writes through it, the read context queries it, and the unit of work commits it — so a
    /// handler's reads and writes share one change tracker and one transaction.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.TryAddTimeProvider();
        services.AddScoped<AuditingInterceptor>();

        services.AddDbContext<ContactsDbContext>((provider, options) => options
            .UseNpgsql(connectionString)
            .AddInterceptors(provider.GetRequiredService<AuditingInterceptor>()));

        services.AddScoped<IContactRepository, ContactRepository>();
        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<ContactsDbContext>());
        services.AddScoped<IContactReadContext>(provider => provider.GetRequiredService<ContactsDbContext>());

        return services;
    }

    /// <summary>
    /// The system clock, but only if nothing has claimed <see cref="TimeProvider"/> already: tests
    /// register a fixed clock before calling this, and overwriting it would make every date-of-birth
    /// rule depend on the day the suite happens to run.
    /// </summary>
    private static void TryAddTimeProvider(this IServiceCollection services)
    {
        if (services.All(descriptor => descriptor.ServiceType != typeof(TimeProvider)))
        {
            services.AddSingleton(TimeProvider.System);
        }
    }
}

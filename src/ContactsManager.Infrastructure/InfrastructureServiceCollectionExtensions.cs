using ContactsManager.Application.Abstractions;
using ContactsManager.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ContactsManager.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.TryAddTimeProvider();
        services.AddScoped<AuditingInterceptor>();

        services.AddDbContext<ContactsDbContext>((provider, options) => options
            .UseNpgsql(connectionString)
            .AddInterceptors(provider.GetRequiredService<AuditingInterceptor>()));

        services.AddScoped<IContactRepository, ContactRepository>();
        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<ContactsDbContext>());

        return services;
    }

    private static void TryAddTimeProvider(this IServiceCollection services)
    {
        if (services.All(descriptor => descriptor.ServiceType != typeof(TimeProvider)))
        {
            services.AddSingleton(TimeProvider.System);
        }
    }
}

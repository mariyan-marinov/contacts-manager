using ContactsManager.Application.Behaviours;
using ContactsManager.Application.Messaging;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ContactsManager.Application;

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ISender, Sender>();

        // Registered outermost first: logging wraps validation, validation wraps the handler.
        services.AddScoped(typeof(IPipelineBehaviour<,>), typeof(LoggingBehaviour<,>));
        services.AddScoped(typeof(IPipelineBehaviour<,>), typeof(ValidationBehaviour<,>));

        services.AddImplementationsOf(typeof(IRequestHandler<,>));
        services.AddImplementationsOf(typeof(IValidator<>));

        return services;
    }

    /// <summary>
    /// Registers every closed implementation of an open generic interface found in this assembly, so a
    /// new slice is wired up by existing, not by being remembered.
    /// </summary>
    private static void AddImplementationsOf(this IServiceCollection services, Type openGenericInterface)
    {
        var candidates = typeof(ApplicationServiceCollectionExtensions).Assembly
            .GetTypes()
            .Where(type => type is { IsAbstract: false, IsGenericTypeDefinition: false });

        foreach (var candidate in candidates)
        {
            var closedInterfaces = candidate.GetInterfaces().Where(contract =>
                contract.IsGenericType && contract.GetGenericTypeDefinition() == openGenericInterface);

            foreach (var contract in closedInterfaces)
            {
                services.AddScoped(contract, candidate);
            }
        }
    }
}

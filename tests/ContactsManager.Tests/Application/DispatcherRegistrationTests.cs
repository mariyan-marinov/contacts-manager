using ContactsManager.Application;
using ContactsManager.Application.Messaging;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ContactsManager.Tests.Application;

/// <summary>
/// A slice that is written but never wired up fails at runtime, on the one request nobody tried. These
/// tests move that failure to the build.
/// </summary>
public class DispatcherRegistrationTests
{
    private static readonly IReadOnlyList<Type> RequestTypes = typeof(ISender).Assembly
        .GetTypes()
        .Where(type => type is { IsAbstract: false, IsInterface: false })
        .Where(type => RequestInterface(type) is not null)
        .ToList();

    private static readonly ServiceCollection Registrations = Register();

    [Fact]
    public void Finds_the_five_slices_that_should_exist() => Assert.Equal(5, RequestTypes.Count);

    [Fact]
    public void Every_request_has_a_registered_handler()
    {
        var unhandled = RequestTypes
            .Where(request => !IsRegistered(typeof(IRequestHandler<,>).MakeGenericType(
                request,
                ResponseTypeOf(request))))
            .Select(request => request.Name);

        Assert.Empty(unhandled);
    }

    [Fact]
    public void Every_command_has_a_registered_validator()
    {
        var unvalidated = RequestTypes
            .Where(IsCommand)
            .Where(command => !IsRegistered(typeof(IValidator<>).MakeGenericType(command)))
            .Select(command => command.Name);

        Assert.Empty(unvalidated);
    }

    [Fact]
    public void Every_query_has_a_registered_validator()
    {
        var unvalidated = RequestTypes
            .Where(request => !IsCommand(request))
            .Where(query => !IsRegistered(typeof(IValidator<>).MakeGenericType(query)))
            .Select(query => query.Name);

        Assert.Empty(unvalidated);
    }

    [Fact]
    public void Registers_both_behaviours_as_open_generics() =>
        Assert.Equal(2, Registrations.Count(service => service.ServiceType == typeof(IPipelineBehaviour<,>)));

    private static ServiceCollection Register()
    {
        var services = new ServiceCollection();
        services.AddApplication();
        return services;
    }

    private static bool IsRegistered(Type serviceType) =>
        Registrations.Any(service => service.ServiceType == serviceType);

    private static Type? RequestInterface(Type type) =>
        Array.Find(
            type.GetInterfaces(),
            contract => contract.IsGenericType
                && (contract.GetGenericTypeDefinition() == typeof(ICommand<>)
                    || contract.GetGenericTypeDefinition() == typeof(IQuery<>)));

    private static bool IsCommand(Type type) =>
        RequestInterface(type)!.GetGenericTypeDefinition() == typeof(ICommand<>);

    private static Type ResponseTypeOf(Type type) => RequestInterface(type)!.GetGenericArguments()[0];
}

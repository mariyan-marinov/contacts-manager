using System.Collections.Concurrent;
using System.Reflection;
using Microsoft.Extensions.DependencyInjection;

namespace ContactsManager.Application.Messaging;

internal sealed class Sender(IServiceProvider services) : ISender
{
    /// <summary>
    /// A request only knows its response type statically, so resolving the handler needs the request's
    /// concrete type. Reflection finds it once per request type and the closed delegate is cached, which
    /// keeps the hot path a dictionary lookup and avoids `dynamic` entirely.
    /// </summary>
    private static readonly ConcurrentDictionary<Type, object> Invokers = new();

    public Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var invoker = (Invoker<TResponse>)Invokers.GetOrAdd(request.GetType(), BuildInvoker<TResponse>);
        return invoker(services, request, cancellationToken);
    }

    private static object BuildInvoker<TResponse>(Type requestType) =>
        typeof(Sender)
            .GetMethod(nameof(InvokePipeline), BindingFlags.NonPublic | BindingFlags.Static)!
            .MakeGenericMethod(requestType, typeof(TResponse))
            .CreateDelegate(typeof(Invoker<TResponse>));

    private static Task<TResponse> InvokePipeline<TRequest, TResponse>(
        IServiceProvider services,
        IRequest<TResponse> request,
        CancellationToken cancellationToken)
        where TRequest : IRequest<TResponse>
    {
        var typedRequest = (TRequest)request;
        var handler = services.GetRequiredService<IRequestHandler<TRequest, TResponse>>();

        RequestHandlerDelegate<TResponse> next = () => handler.Handle(typedRequest, cancellationToken);

        // Reversed so the first registered behaviour ends up outermost.
        foreach (var behaviour in services.GetServices<IPipelineBehaviour<TRequest, TResponse>>().Reverse())
        {
            var nextStep = next;
            next = () => behaviour.Handle(typedRequest, nextStep, cancellationToken);
        }

        return next();
    }

    private delegate Task<TResponse> Invoker<TResponse>(
        IServiceProvider services,
        IRequest<TResponse> request,
        CancellationToken cancellationToken);
}

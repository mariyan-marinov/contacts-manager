namespace ContactsManager.Application.Messaging;

/// <summary>
/// A step wrapped around every dispatch. Calling <c>next</c> continues to the handler; returning or
/// throwing without calling it stops the request there.
/// </summary>
public interface IPipelineBehaviour<in TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken);
}

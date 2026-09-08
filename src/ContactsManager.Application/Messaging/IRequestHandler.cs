namespace ContactsManager.Application.Messaging;

/// <summary>
/// Exactly one handler per request type — the <see cref="ISender"/> resolves it by that type, so a
/// second registration for the same request is a wiring mistake rather than a choice.
/// </summary>
public interface IRequestHandler<in TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken);
}

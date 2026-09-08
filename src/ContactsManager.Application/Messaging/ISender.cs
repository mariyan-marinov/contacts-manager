namespace ContactsManager.Application.Messaging;

/// <summary>
/// The single way into the application layer. Controllers depend on this and never on a handler, so
/// a slice can be added, split or renamed without any endpoint knowing.
/// </summary>
public interface ISender
{
    Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default);
}

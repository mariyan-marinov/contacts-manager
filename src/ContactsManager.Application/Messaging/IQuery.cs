namespace ContactsManager.Application.Messaging;

/// <summary>Reads state. Never writes, and never loads an aggregate it does not need.</summary>
public interface IQuery<out TResponse> : IRequest<TResponse>;

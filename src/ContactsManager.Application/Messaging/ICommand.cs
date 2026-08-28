namespace ContactsManager.Application.Messaging;

/// <summary>Changes state. Returns only what the caller cannot derive, such as a new identity.</summary>
public interface ICommand<out TResponse> : IRequest<TResponse>;

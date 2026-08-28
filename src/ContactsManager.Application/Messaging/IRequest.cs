namespace ContactsManager.Application.Messaging;

/// <summary>Marker for anything the <see cref="ISender"/> can dispatch.</summary>
public interface IRequest<out TResponse>;

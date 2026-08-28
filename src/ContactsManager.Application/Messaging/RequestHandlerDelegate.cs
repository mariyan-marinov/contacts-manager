namespace ContactsManager.Application.Messaging;

/// <summary>The next step in the pipeline: either another behaviour or the handler itself.</summary>
public delegate Task<TResponse> RequestHandlerDelegate<TResponse>();

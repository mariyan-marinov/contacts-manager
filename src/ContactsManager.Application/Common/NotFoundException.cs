namespace ContactsManager.Application.Common;

/// <summary>
/// The resource a caller asked for does not exist. The API maps this to a 404, and the message is
/// built here so no endpoint has to phrase one.
/// </summary>
public sealed class NotFoundException(string resource, object key)
    : Exception($"{resource} '{key}' was not found.");

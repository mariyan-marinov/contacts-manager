namespace ContactsManager.Application.Messaging;

/// <summary>
/// A response for commands that have nothing to report. Keeps one dispatch path rather than a second
/// set of interfaces for the void case.
/// </summary>
public readonly record struct Unit
{
    public static readonly Unit Value;
}

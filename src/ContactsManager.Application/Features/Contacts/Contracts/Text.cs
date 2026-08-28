namespace ContactsManager.Application.Features.Contacts.Contracts;

/// <summary>
/// The same tidying the value objects apply, so a validator judges the text that will actually be
/// stored rather than the raw keystrokes.
/// </summary>
internal static class Text
{
    internal static string Trimmed(string? value) => (value ?? string.Empty).Trim();

    internal static string UpperTrimmed(string? value) => Trimmed(value).ToUpperInvariant();
}

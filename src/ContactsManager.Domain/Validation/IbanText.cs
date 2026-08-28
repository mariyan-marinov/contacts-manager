namespace ContactsManager.Domain.Validation;

/// <summary>
/// Normalising and masking live here rather than on <c>Iban</c> so that the command validators can
/// judge the same text the domain will store: someone typing `nl91 abna 0417 1643 00` must not be
/// rejected at the API boundary for a spelling the domain would have accepted.
/// </summary>
public static class IbanText
{
    public static string Normalise(string? value) =>
        value is null
            ? string.Empty
            : string.Concat(value.Where(character => !char.IsWhiteSpace(character))).ToUpperInvariant();

    /// <summary>
    /// First four characters, four asterisks, last four — `NL91****4300`. The asterisk run is fixed
    /// so the mask does not disclose how long the IBAN is.
    /// </summary>
    public static string Mask(string value) => $"{value[..4]}****{value[^4..]}";
}

using ContactsManager.Domain.Validation;

namespace ContactsManager.Domain.Contacts;

public sealed record Iban
{
    private Iban(string value) => Value = value;

    public string Value { get; }

    /// <summary>
    /// First four characters, four asterisks, last four — `NL91****0300`. The asterisk run is fixed
    /// so the mask does not disclose how long the IBAN is.
    /// </summary>
    public string Masked => $"{Value[..4]}****{Value[^4..]}";

    public static Iban Create(string? value)
    {
        var iban = new Iban(Normalise(value));
        DomainValidationException.ThrowIfInvalid(new IbanValidator().Validate(iban));
        return iban;
    }

    public override string ToString() => Value;

    private static string Normalise(string? value) =>
        value is null
            ? string.Empty
            : string.Concat(value.Where(character => !char.IsWhiteSpace(character))).ToUpperInvariant();
}

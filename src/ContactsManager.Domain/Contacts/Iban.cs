using ContactsManager.Domain.Validation;

namespace ContactsManager.Domain.Contacts;

public sealed record Iban
{
    private Iban(string value) => Value = value;

    public string Value { get; }

    /// <summary>What the list endpoint sends. See <see cref="IbanText.Mask"/> for the shape.</summary>
    public string Masked => IbanText.Mask(Value);

    /// <summary>
    /// Normalised before validating, so an IBAN typed in its conventional spaced groups is accepted
    /// and stored in the single compact form the checksum is computed over.
    /// </summary>
    public static Iban Create(string? value)
    {
        var iban = new Iban(IbanText.Normalise(value));
        DomainValidationException.ThrowIfInvalid(new IbanValidator().Validate(iban));
        return iban;
    }

    public override string ToString() => Value;
}

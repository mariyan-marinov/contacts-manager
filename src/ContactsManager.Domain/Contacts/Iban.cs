using ContactsManager.Domain.Validation;

namespace ContactsManager.Domain.Contacts;

public sealed record Iban
{
    /// <summary>Stateless and thread-safe, so one instance serves every construction.</summary>
    private static readonly IbanValidator Validator = new();

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
        DomainValidationException.ThrowIfInvalid(Validator.Validate(iban));
        return iban;
    }

    public override string ToString() => Value;
}

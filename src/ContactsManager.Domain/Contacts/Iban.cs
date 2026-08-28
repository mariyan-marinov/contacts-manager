using ContactsManager.Domain.Validation;

namespace ContactsManager.Domain.Contacts;

public sealed record Iban
{
    private Iban(string value) => Value = value;

    public string Value { get; }

    public string Masked => IbanText.Mask(Value);

    public static Iban Create(string? value)
    {
        var iban = new Iban(IbanText.Normalise(value));
        DomainValidationException.ThrowIfInvalid(new IbanValidator().Validate(iban));
        return iban;
    }

    public override string ToString() => Value;
}

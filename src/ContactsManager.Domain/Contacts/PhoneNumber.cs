using ContactsManager.Domain.Validation;

namespace ContactsManager.Domain.Contacts;

public sealed record PhoneNumber
{
    /// <summary>Stateless and thread-safe, so one instance serves every construction.</summary>
    private static readonly PhoneNumberValidator Validator = new();

    private PhoneNumber(string value) => Value = value;

    public string Value { get; }

    public static PhoneNumber Create(string? value)
    {
        var phone = new PhoneNumber((value ?? string.Empty).Trim());
        DomainValidationException.ThrowIfInvalid(Validator.Validate(phone));
        return phone;
    }

    public override string ToString() => Value;
}

using ContactsManager.Domain.Validation;

namespace ContactsManager.Domain.Contacts;

public sealed record PersonName
{
    /// <summary>Stateless and thread-safe, so one instance serves every construction.</summary>
    private static readonly PersonNameValidator Validator = new();

    private PersonName(string first, string surname)
    {
        First = first;
        Surname = surname;
    }

    public string First { get; }

    public string Surname { get; }

    public static PersonName Create(string? first, string? surname)
    {
        var name = new PersonName((first ?? string.Empty).Trim(), (surname ?? string.Empty).Trim());
        DomainValidationException.ThrowIfInvalid(Validator.Validate(name));
        return name;
    }

    public override string ToString() => $"{First} {Surname}";
}

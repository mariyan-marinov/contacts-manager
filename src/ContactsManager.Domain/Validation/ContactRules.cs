using System.Text.RegularExpressions;
using FluentValidation;

namespace ContactsManager.Domain.Validation;

/// <summary>
/// Every field rule in the system, written once. Value object validators and command validators both
/// compose these, so a rule can never drift between what the API rejects and what the domain accepts.
/// </summary>
public static partial class ContactRules
{
    public const int NameMaxLength = 50;
    public const int StreetMaxLength = 100;
    public const int HouseNumberMaxLength = 10;
    public const int PostalCodeMaxLength = 12;
    public const int CityMaxLength = 85;
    public const int MaximumAgeInYears = 130;
    public const int PhoneMinLength = 8;
    public const int PhoneMaxLength = 20;
    public const int PhoneMinimumDigits = 7;
    public const int IbanMinLength = 15;
    public const int IbanMaxLength = 34;

    public static IRuleBuilderOptions<T, string> PersonNamePart<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty()
            .MaximumLength(NameMaxLength)
            .Matches(PersonNamePattern())
            .WithMessage("'{PropertyName}' may contain only letters, spaces, apostrophes and hyphens.");

    public static IRuleBuilderOptions<T, string> Street<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().MaximumLength(StreetMaxLength);

    public static IRuleBuilderOptions<T, string> HouseNumber<T>(this IRuleBuilder<T, string> rule) =>
        rule.MaximumLength(HouseNumberMaxLength);

    public static IRuleBuilderOptions<T, string> PostalCode<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty()
            .MaximumLength(PostalCodeMaxLength)
            .Matches(PostalCodePattern())
            .WithMessage("'{PropertyName}' may contain only letters, digits, spaces and hyphens.");

    public static IRuleBuilderOptions<T, string> City<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().MaximumLength(CityMaxLength);

    public static IRuleBuilderOptions<T, string> CountryCode<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty()
            .Must(Countries.IsKnownAlpha2)
            .WithMessage("'{PropertyName}' must be an ISO 3166-1 alpha-2 country code.");

    /// <summary>
    /// Deliberately permissive: a number typed as `06 12345678` carries no dialing code to infer, so
    /// the value is kept as entered rather than guessed into E.164.
    /// </summary>
    public static IRuleBuilderOptions<T, string> PhoneNumber<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty()
            .Length(PhoneMinLength, PhoneMaxLength)
            .Matches(PhonePattern())
            .WithMessage("'{PropertyName}' may contain only digits, spaces and the characters + - ( ).")
            .Must(HasEnoughDigits)
            .WithMessage($"'{{PropertyName}}' must contain at least {PhoneMinimumDigits} digits.");

    public static IRuleBuilderOptions<T, string> Iban<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty()
            .Length(IbanMinLength, IbanMaxLength)
            .Matches(IbanPattern())
            .WithMessage("'{PropertyName}' is not shaped like an IBAN.")
            .Must(Mod97.IsValid)
            .WithMessage("'{PropertyName}' has an invalid checksum.");

    public static IRuleBuilderOptions<T, DateOnly> DateOfBirth<T>(this IRuleBuilder<T, DateOnly> rule, DateOnly today) =>
        rule.Must(value => value <= today)
            .WithMessage("'{PropertyName}' cannot be in the future.")
            .Must(value => value >= today.AddYears(-MaximumAgeInYears))
            .WithMessage($"'{{PropertyName}}' cannot be more than {MaximumAgeInYears} years ago.");

    private static bool HasEnoughDigits(string value) => value.Count(char.IsAsciiDigit) >= PhoneMinimumDigits;

    [GeneratedRegex(@"^\p{L}[\p{L}\p{M}\s'-]*$")]
    private static partial Regex PersonNamePattern();

    [GeneratedRegex(@"^[A-Z]{2}[0-9]{2}[A-Z0-9]+$")]
    private static partial Regex IbanPattern();

    [GeneratedRegex(@"^[0-9+\-() ]+$")]
    private static partial Regex PhonePattern();

    [GeneratedRegex(@"^[A-Za-z0-9][A-Za-z0-9 -]*$")]
    private static partial Regex PostalCodePattern();
}

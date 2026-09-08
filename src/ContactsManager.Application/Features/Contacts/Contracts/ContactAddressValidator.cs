using ContactsManager.Domain.Validation;
using FluentValidation;

namespace ContactsManager.Application.Features.Contacts.Contracts;

/// <summary>
/// Rules come from <see cref="ContactRules"/>, applied to the tidied text the value object will
/// actually store, so nothing is rejected here that the domain would have accepted. Errors are named
/// after the field the caller sent.
/// </summary>
internal sealed class ContactAddressValidator : AbstractValidator<ContactAddress>
{
    public ContactAddressValidator()
    {
        RuleFor(address => Text.Trimmed(address.Street))
            .Street()
            .OverridePropertyName(nameof(ContactAddress.Street));

        RuleFor(address => Text.Trimmed(address.HouseNumber))
            .HouseNumber()
            .OverridePropertyName(nameof(ContactAddress.HouseNumber));

        RuleFor(address => Text.Trimmed(address.PostalCode))
            .PostalCode()
            .OverridePropertyName(nameof(ContactAddress.PostalCode));

        RuleFor(address => Text.Trimmed(address.City))
            .City()
            .OverridePropertyName(nameof(ContactAddress.City));

        RuleFor(address => Text.UpperTrimmed(address.Country))
            .CountryCode()
            .OverridePropertyName(nameof(ContactAddress.Country));
    }
}

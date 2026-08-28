using ContactsManager.Domain.Contacts;
using FluentValidation;

namespace ContactsManager.Domain.Validation;

public sealed class AddressValidator : AbstractValidator<Address>
{
    public AddressValidator()
    {
        RuleFor(address => address.Street).Street();
        RuleFor(address => address.HouseNumber).HouseNumber();
        RuleFor(address => address.PostalCode).PostalCode();
        RuleFor(address => address.City).City();
        RuleFor(address => address.Country).CountryCode();
    }
}

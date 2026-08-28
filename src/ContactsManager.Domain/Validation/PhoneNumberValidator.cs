using ContactsManager.Domain.Contacts;
using FluentValidation;

namespace ContactsManager.Domain.Validation;

public sealed class PhoneNumberValidator : AbstractValidator<PhoneNumber>
{
    public PhoneNumberValidator() => RuleFor(phone => phone.Value).PhoneNumber();
}

using ContactsManager.Domain.Contacts;
using FluentValidation;

namespace ContactsManager.Domain.Validation;

public sealed class IbanValidator : AbstractValidator<Iban>
{
    public IbanValidator() => RuleFor(iban => iban.Value).Iban();
}

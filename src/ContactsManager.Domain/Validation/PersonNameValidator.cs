using ContactsManager.Domain.Contacts;
using FluentValidation;

namespace ContactsManager.Domain.Validation;

public sealed class PersonNameValidator : AbstractValidator<PersonName>
{
    public PersonNameValidator()
    {
        RuleFor(name => name.First).PersonNamePart();
        RuleFor(name => name.Surname).PersonNamePart();
    }
}

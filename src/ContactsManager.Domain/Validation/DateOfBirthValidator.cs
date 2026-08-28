using ContactsManager.Domain.Contacts;
using FluentValidation;

namespace ContactsManager.Domain.Validation;

public sealed class DateOfBirthValidator : AbstractValidator<DateOfBirth>
{
    public DateOfBirthValidator(DateOnly today) =>
        RuleFor(dateOfBirth => dateOfBirth.Value).DateOfBirth(today);
}

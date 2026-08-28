using ContactsManager.Application.Features.Contacts.Contracts;
using ContactsManager.Domain.Validation;
using FluentValidation;

namespace ContactsManager.Application.Features.Contacts.CreateContact;

internal sealed class CreateContactCommandValidator : AbstractValidator<CreateContactCommand>
{
    public CreateContactCommandValidator(TimeProvider clock)
    {
        RuleFor(command => Text.Trimmed(command.FirstName))
            .PersonNamePart()
            .OverridePropertyName(nameof(CreateContactCommand.FirstName));

        RuleFor(command => Text.Trimmed(command.Surname))
            .PersonNamePart()
            .OverridePropertyName(nameof(CreateContactCommand.Surname));

        RuleFor(command => command.DateOfBirth)
            .DateOfBirth(DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime));

        RuleFor(command => command.Address)
            .NotNull()
            .SetValidator(new AddressRequestValidator());

        RuleFor(command => Text.Trimmed(command.PhoneNumber))
            .PhoneNumber()
            .OverridePropertyName(nameof(CreateContactCommand.PhoneNumber));

        // Normalised first: an IBAN is conventionally written in spaced groups, and rejecting that
        // spelling at the boundary would refuse what the domain happily stores.
        RuleFor(command => IbanText.Normalise(command.Iban))
            .Iban()
            .OverridePropertyName(nameof(CreateContactCommand.Iban));
    }
}

using ContactsManager.Application.Abstractions;
using ContactsManager.Application.Common;
using ContactsManager.Application.Features.Contacts.Contracts;
using ContactsManager.Application.Messaging;
using ContactsManager.Domain.Contacts;
using Microsoft.EntityFrameworkCore;

namespace ContactsManager.Application.Features.Contacts.GetContactById;

internal sealed class GetContactByIdQueryHandler(IContactReadContext read)
    : IRequestHandler<GetContactByIdQuery, ContactDetail>
{
    /// <summary>
    /// Projected in SQL rather than loaded and mapped: no aggregate is materialised, and the response
    /// shape is visible right here next to the query that fills it.
    /// </summary>
    public async Task<ContactDetail> Handle(GetContactByIdQuery query, CancellationToken cancellationToken)
    {
        var detail = await read.Contacts
            .Where(contact => contact.Id == new ContactId(query.Id))
            .Select(contact => new ContactDetail(
                contact.Id.Value,
                contact.Name.First,
                contact.Name.Surname,
                contact.DateOfBirth.Value,
                new AddressRequest(
                    contact.Address.Street,
                    contact.Address.HouseNumber,
                    contact.Address.PostalCode,
                    contact.Address.City,
                    contact.Address.Country),
                contact.Phone.Value,
                contact.Iban.Value,
                contact.Version))
            .FirstOrDefaultAsync(cancellationToken);

        return detail ?? throw new NotFoundException(nameof(Contact), query.Id);
    }
}

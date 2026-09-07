import { ContactListView, isSameListView } from './contact.model';

const view: ContactListView = { page: 2, size: 10, sort: 'surname', direction: 'asc' };

describe('isSameListView', () => {
  it('recognises the table repeating the state it was given', () => {
    expect(isSameListView(view, { ...view })).toBe(true);
  });

  it('sees a change in any one of paging or sorting', () => {
    expect(isSameListView(view, { ...view, page: 3 })).toBe(false);
    expect(isSameListView(view, { ...view, size: 20 })).toBe(false);
    expect(isSameListView(view, { ...view, sort: 'city' })).toBe(false);
    expect(isSameListView(view, { ...view, direction: 'desc' })).toBe(false);
  });
});

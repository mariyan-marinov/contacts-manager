import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MessageModule } from 'primeng/message';

/**
 * One field: its label, whatever control is projected into it, and the messages that belong to it.
 * Written once here rather than nine times in a form's template — and it is what guarantees every
 * field is labelled, marked required and wired to its errors the same way.
 *
 * It owns the ids it publishes: the label points at `inputId`, which the projected control must
 * carry, and `describedBy` names the hint and the error region so a screen reader reads them with
 * the field rather than leaving them to the eye alone.
 */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MessageModule],
  template: `
    <label class="field__label" [for]="inputId()">
      {{ label() }}
      @if (required()) {
        <span aria-hidden="true" class="field__required">*</span>
      }
    </label>

    <ng-content />

    @if (hint() !== null) {
      <small class="field__hint" [id]="hintId()">{{ hint() }}</small>
    }

    <!-- Always rendered, so the id a control is described by exists before there is anything to say. -->
    <div class="field__errors" [id]="errorId()" role="alert">
      @for (message of messages(); track message) {
        <p-message severity="error" variant="simple" size="small">{{ message }}</p-message>
      }
    </div>
  `,
  styleUrl: './form-field.component.scss',
  host: {
    '[class]': "'field field--span-' + span()",
  },
})
export class FormFieldComponent {
  /** Names the ids this field publishes, so they are stable and readable in the DOM. */
  readonly name = input.required<string>();

  readonly label = input.required<string>();

  readonly required = input(false);

  readonly hint = input<string | null>(null);

  /** How many of the form grid's twelve columns this field takes once there is room for them. */
  readonly span = input(12);

  readonly messages = input<readonly string[]>([]);

  /** The id the projected control must carry, so the label above is really its label. */
  readonly inputId = computed(() => `${this.name()}Input`);

  readonly errorId = computed(() => `${this.name()}-error`);

  readonly hintId = computed(() => `${this.name()}-hint`);

  /** What the projected control should put in its `aria-describedby`. */
  readonly describedBy = computed(() =>
    [this.hint() === null ? null : this.hintId(), this.errorId()]
      .filter((id) => id !== null)
      .join(' '),
  );
}

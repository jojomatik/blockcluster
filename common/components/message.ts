import { v4 as uuid } from "uuid";

/**
 * An enum that describes the type of a {@link Message}.
 */
export enum MessageType {
  Default,
  Error,
}

/**
 * A message from the server either from STDOUT or from STDERR.
 */
export default class Message {
  /**
   * The {@link MessageType} of this {@link Message}.
   * @private
   */
  private _type!: MessageType;

  /**
   * The text of this {@link Message}.
   * @private
   */
  private _text!: string;

  /**
   * The unique ID of this {@link Message}.
   * @private
   */
  private _uuid: string = uuid();

  /**
   * Creates a {@link Message} based on its type and text.
   * @param type the {@link MessageType} of this message.
   * @param text the text of this message.
   */
  constructor(type: MessageType = MessageType.Default, text = "") {
    this.type = type;
    this.text = text;
  }

  /**
   * Returns the {@link _type}.
   */
  get type(): MessageType {
    return this._type;
  }

  /**
   * Sets a new value for {@link _type}.
   * @param value the new value.
   */
  set type(value: MessageType) {
    this._type = value;
  }

  /**
   * Returns the {@link _text}.
   */
  get text(): string {
    return this._text;
  }

  /**
   * Sets a new value for {@link _text}.
   * @param value the new value.
   */
  set text(value: string) {
    this._text = value;
  }

  /**
   * Returns the {@link _uuid}.
   */
  get uuid(): string {
    return this._uuid;
  }

  /**
   * Sets a new value for {@link _uuid}.
   * @param value the new value.
   */
  set uuid(value: string) {
    this._uuid = value;
  }
}
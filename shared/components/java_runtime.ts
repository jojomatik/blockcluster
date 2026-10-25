/*
blockcluster - An in-browser manager for your minecraft servers.
Copyright (C) 2021 jojomatik

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * A representation of a java runtime.
 */
export default class JavaRuntime {
  /**
   * Creates an instance of {@link JavaRuntime} based on its path and name.
   * @param path the path to the java runtime.
   * @param name the name of the java runtime/ its version descriptor.
   * @param isDefault whether the java runtime is the default runtime.
   */
  constructor(path = "", name = "", isDefault = false) {
    this._path = path;
    this._name = name;
    this._isDefault = isDefault;
  }

  /**
   * The path to the java runtime.
   * @private
   */
  private _path: string;

  /**
   * Returns {@link #_path}.
   */
  get path(): string {
    return this._path;
  }

  /**
   * Sets a new value for {@link #_path}.
   * @param value the new value.
   */
  set path(value: string) {
    this._path = value;
  }

  /**
   * The name of the java runtime/ its version descriptor.
   * @private
   */
  private _name: string;

  /**
   * Returns {@link #_name}.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Sets a new value for {@link #_name}.
   * @param value the new value.
   */
  set name(value: string) {
    this._name = value;
  }

  /**
   * Whether the java runtime is the default runtime.
   * @private
   */
  private _isDefault: boolean;

  /**
   * Returns {@link #_isDefault}.
   */
  get isDefault(): boolean {
    return this._isDefault;
  }

  /**
   * Sets a new value for {@link #_isDefault}.
   * @param value the new value.
   */
  set isDefault(value: boolean) {
    this._isDefault = value;
  }
}

/**
 * Returns the default runtime from a list of multiple {@link JavaRuntime}s.
 * @param runtimes the default runtime.
 */
export function getDefaultRuntime(runtimes: JavaRuntime[]): JavaRuntime {
  for (const runtime of runtimes) {
    if (runtime.isDefault) return runtime;
  }
  throw new Error("No default runtime found.");
}

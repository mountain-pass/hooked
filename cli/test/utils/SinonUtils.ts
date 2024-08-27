import { expect } from "chai";
import { SinonSpy } from "sinon";

/**
 * Fetches the last non-blank call from a spy.
 * @param spy
 * @returns 
 */
export const fetchLastCall = (spy: SinonSpy): { all: string[], last: string } => {
    const calls = spy.getCalls();
    expect(calls.length, "spy was never called").to.be.greaterThan(0)
    const all = calls.map((call) => call.args[0].trim()).filter(f => f !== '')
    return { last: all[all.length - 1], all }
}
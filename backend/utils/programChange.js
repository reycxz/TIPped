const ALLOWED_PROGRAMS = require('../constants/programs.json');

const PROGRAM_CHANGE_COOLDOWN_MS = 180 * 24 * 60 * 60 * 1000;

const getNextProgramChangeAt = (programChangedAt, now = Date.now()) => {
  if (!programChangedAt) return null;

  const changedAt = new Date(programChangedAt).getTime();
  if (!Number.isFinite(changedAt)) return null;

  const nextChangeAt = changedAt + PROGRAM_CHANGE_COOLDOWN_MS;
  return nextChangeAt > now ? new Date(nextChangeAt).toISOString() : null;
};

const updateProgram = (user, body, now = Date.now()) => {
  if (!body || !Object.prototype.hasOwnProperty.call(body, 'program') || body.program === user.program) {
    return null;
  }

  const nextProgram = body.program;
  if (typeof nextProgram !== 'string' || !ALLOWED_PROGRAMS.includes(nextProgram)) {
    return {
      status: 400,
      body: { error: 'Invalid program' }
    };
  }

  const changedAt = user.programChangedAt ? new Date(user.programChangedAt).getTime() : NaN;
  if (Number.isFinite(changedAt)) {
    const nextChangeAt = changedAt + PROGRAM_CHANGE_COOLDOWN_MS;
    if (now < nextChangeAt) {
      const nextProgramChangeAt = new Date(nextChangeAt).toISOString();
      return {
        status: 429,
        body: {
          error: `You can change your program again on ${nextProgramChangeAt}`,
          nextProgramChangeAt
        }
      };
    }
  }

  user.program = nextProgram;
  user.programChangedAt = new Date(now);
  return null;
};

module.exports = {
  PROGRAM_CHANGE_COOLDOWN_MS,
  getNextProgramChangeAt,
  updateProgram
};

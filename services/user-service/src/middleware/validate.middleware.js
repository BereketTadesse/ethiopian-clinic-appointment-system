export const validate = (schema) => async (req, res, next) => {
  try {
    // Validate request body, query, and params against the provided Zod schema
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    // If validation passes, move to the next middleware/controller
    return next();
  } catch (error) {
    // Pass validation error directly to the centralized error handler
    return next(error);
  }
};

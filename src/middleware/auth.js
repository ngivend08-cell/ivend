function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  req.session.flash = { type: 'error', message: 'Effettua il login per continuare.' };
  return res.redirect('/login');
}

function ensureRole(...allowedRoles) {
  return (req, res, next) => {
    if (req.user && allowedRoles.includes(req.user.role)) {
      return next();
    }
    req.session.flash = { type: 'error', message: 'Non hai i permessi necessari.' };
    return res.redirect('/dashboard');
  };
}

function ensureTrackOwnershipOrAdmin(trackService) {
  return async (req, res, next) => {
    const track = await trackService.findById(Number(req.params.id));
    if (!track) {
      req.session.flash = { type: 'error', message: 'Brano non trovato.' };
      return res.redirect('/dashboard');
    }

    if (req.user.role === 'admin' || track.owner_id === req.user.id) {
      return next();
    }

    req.session.flash = { type: 'error', message: 'Puoi modificare solo i tuoi contenuti.' };
    return res.redirect('/dashboard');
  };
}

module.exports = { ensureAuthenticated, ensureRole, ensureTrackOwnershipOrAdmin };

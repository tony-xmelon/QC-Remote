# Private reference inputs

Physical-device screenshots, graphics trees, extracted manual artwork, icon
measurements, and typography measurements are deliberately excluded from the
public repository. They are interoperability and visual-validation evidence,
not redistributable application assets.

On an authorized development machine, the optional private directories may be
placed beneath this directory using their established names:

- `qc-ui-corpus/`
- `qc-ui-official-manual/`
- `qc-ui-official-details/`
- `qc-ui-iconography/`
- `qc-ui-typography/`
- `qc-ui-app-golden/`
- `qc-ui-coverage/`

They are ignored by Git. Do not commit them, attach them to CI artifacts, copy
them into application packages, or publish them in support bundles. Capture or
download them only where the developer has lawful access and only to the extent
needed for interoperability and private validation.

Normal application builds and tests must not require these directories. The
specialized `verify:qc-*`, `compare:qc-*`, and visual-report commands are local
validation tools and may require the private inputs.

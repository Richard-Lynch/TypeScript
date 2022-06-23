/* @internal */
namespace ts.codefix {
    const fixId = "importNonExportedMember";

    const errorCodes = [
        Diagnostics.Module_0_declares_1_locally_but_it_is_not_exported.code,
    ];

    registerCodeFix({
        errorCodes,

        getCodeActions(context) {
            const { sourceFile } = context;

            const info = getInfo(sourceFile, context, context.span.start);

            if (!info || info.originSourceFile.isDeclarationFile) {
                return undefined;
            }

            const changes = textChanges.ChangeTracker.with(context, (t) =>
                doChange(t, info.originSourceFile, info.node)
            );

            return [
                createCodeFixAction(
                    /*fixName*/ fixId,
                    changes,
                    /*description*/ [
                        Diagnostics.Export_0_from_module_1,
                        info.node.text,
                        showModuleSpecifier(info.importDecl),
                    ],
                    fixId,
                    /*fixAllDescription*/ Diagnostics.Add_all_missing_exports
                ),
            ];
        },

        fixIds: [fixId],

        getAllCodeActions: (context) =>
            codeFixAll(context, errorCodes, (changes, diag) => {
                const info = getInfo(diag.file, context, diag.start);

                if (info) {
                    doChange(changes, info.originSourceFile, info.node);
                }
            }),
    });

    interface Info {
        readonly node: Identifier;

        readonly importDecl: ImportDeclaration;

        readonly originSourceFile: SourceFile;
    }

    function getInfo(
        sourceFile: SourceFile,
        context: CodeFixContext | CodeFixAllContext,
        pos: number
    ): Info | undefined {
        const node = getTokenAtPosition(sourceFile, pos);

        if (!isIdentifier(node)) {
            return;
        }

        const importDecl = findAncestor(node, isImportDeclaration);

        if (!importDecl || !isStringLiteralLike(importDecl.moduleSpecifier)) {
            return undefined;
        }

        const resolvedModule = getResolvedModule(
            sourceFile,
            /*moduleName*/ importDecl.moduleSpecifier.text,
            /*mode*/ undefined
        );

        if (!resolvedModule) {
            return undefined;
        }

        const originSourceFile = context.program.getSourceFile(
            resolvedModule.resolvedFileName
        );

        if (!originSourceFile) {
            return undefined;
        }

        return { node, importDecl, originSourceFile };
    }

    function getNamedExportDeclaration(
        sourceFile: SourceFile
    ): ExportDeclaration | undefined {
        let namedExport;

        for (const statement of sourceFile.statements) {
            if (
                isExportDeclaration(statement) &&
                statement.exportClause &&
                isNamedExports(statement.exportClause) &&
                !statement.isTypeOnly &&
                statement.moduleSpecifier === undefined
            ) {
                namedExport = statement;
            }
        }

        return namedExport;
    }

    function compareIdentifiers(s1: Identifier, s2: Identifier) {
        return compareStringsCaseInsensitive(s1.text, s2.text);
    }

    function sortSpecifiers(
        specifiers: ExportSpecifier[]
    ): readonly ExportSpecifier[] {
        return stableSort(specifiers, (s1, s2) =>
            compareIdentifiers(
                s1.propertyName || s1.name,
                s2.propertyName || s2.name
            )
        );
    }

    const isVariableDeclarationListWith1Element = (
        node: Node
    ): node is VariableDeclarationList =>
        isVariableDeclarationList(node) && node.declarations.length === 1;

    function doChange(
        changes: textChanges.ChangeTracker,
        sourceFile: SourceFile,
        node: Identifier
    ): void {
        const moduleSymbol = sourceFile.localSymbol ?? sourceFile.symbol;

        const localSymbol = moduleSymbol.valueDeclaration?.locals?.get(
            node.escapedText
        );

        if (localSymbol === undefined) {
            return;
        }

        // Node we need to export is a function, class, or variable declaration
        if (
            localSymbol.valueDeclaration !== undefined &&
            (isDeclarationStatement(localSymbol.valueDeclaration) ||
                isVariableStatement(localSymbol.valueDeclaration))
        ) {
            const node = localSymbol.valueDeclaration;

            return changes.insertExportModifier(sourceFile, node);
        }
        // Node we need to export is a variable declaration
        else if (
            localSymbol.valueDeclaration &&
            isVariableDeclarationListWith1Element(
                localSymbol.valueDeclaration.parent
            )
        ) {
            const node = localSymbol.valueDeclaration.parent;

            return changes.insertExportModifier(sourceFile, node);
        }

        // In all other cases => the node is a variable, and should be exported via `export {a}`
        const namedExportDeclaration = getNamedExportDeclaration(sourceFile);

        // If there is an existing export
        if (
            namedExportDeclaration &&
            !namedExportDeclaration.isTypeOnly &&
            !namedExportDeclaration.moduleSpecifier === undefined &&
            namedExportDeclaration.exportClause &&
            isNamedExports(namedExportDeclaration.exportClause)
        ) {
            return changes.replaceNode(
                sourceFile,
                namedExportDeclaration,
                factory.updateExportDeclaration(
                    /*node*/ namedExportDeclaration,
                    /*modifiers*/ undefined,
                    /*isTypeOnly*/ false,
                    /*exportClause*/ factory.updateNamedExports(
                        /*node*/ namedExportDeclaration.exportClause,
                        /*elements*/ sortSpecifiers(
                            namedExportDeclaration.exportClause.elements.concat(
                                factory.createExportSpecifier(
                                    /*isTypeOnly*/ false,
                                    /*propertyName*/ undefined,
                                    node
                                )
                            )
                        )
                    ),
                    /*moduleSpecifier*/ undefined,
                    /*assertClause*/ undefined
                )
            );
        }
        // There is no existing export
        else {
            return changes.insertNodeAtEndOfScope(
                sourceFile,
                sourceFile,
                factory.createExportDeclaration(
                    /*modifiers*/ undefined,
                    /*isTypeOnly*/ false,
                    /*exportClause*/ factory.createNamedExports([
                        factory.createExportSpecifier(
                            /*isTypeOnly*/ false,
                            /*propertyName*/ undefined,
                            node
                        ),
                    ]),
                    /*moduleSpecifier*/ undefined
                )
            );
        }
    }
}

import deleteEggVariable from '@/api/admin/eggs/deleteEggVariable';
import { NoItems } from '@/components/admin/AdminTable';
import ConfirmationModal from '@/components/elements/ConfirmationModal';
import { Form, Formik, FormikHelpers, useFormikContext } from 'formik';
import React, { useState } from 'react';
import tw from 'twin.macro';
import { array, boolean, object, string } from 'yup';
import getEgg, { Egg, EggVariable } from '@/api/admin/eggs/getEgg';
import updateEggVariables from '@/api/admin/eggs/updateEggVariables';
import NewVariableButton from '@/components/admin/nests/eggs/NewVariableButton';
import AdminBox from '@/components/admin/AdminBox';
import Button from '@/components/elements/Button';
import Checkbox from '@/components/elements/Checkbox';
import Field, { FieldRow, TextareaField } from '@/components/elements/Field';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import useFlash from '@/plugins/useFlash';
import { TrashIcon } from '@heroicons/react/outline';

export const validationSchema = object().shape({
    name: string().required().min(1).max(191),
    description: string(),
    envVariable: string().required().min(1).max(191),
    defaultValue: string(),
    userViewable: boolean().required(),
    userEditable: boolean().required(),
    rules: string().required(),
});

export function EggVariableForm ({ prefix }: { prefix: string }) {
    return (
        <>
            <Field
                id={`${prefix}name`}
                name={`${prefix}name`}
                label={'Name'}
                type={'text'}
                css={tw`mb-6`}
            />

            <TextareaField
                id={`${prefix}description`}
                name={`${prefix}description`}
                label={'Description'}
                rows={3}
                css={tw`mb-4`}
            />

            <FieldRow>
                <Field
                    id={`${prefix}envVariable`}
                    name={`${prefix}envVariable`}
                    label={'Environment Variable'}
                    type={'text'}
                />

                <Field
                    id={`${prefix}defaultValue`}
                    name={`${prefix}defaultValue`}
                    label={'Default Value'}
                    type={'text'}
                />
            </FieldRow>

            <div css={tw`flex flex-row mb-6`}>
                <Checkbox
                    id={`${prefix}userViewable`}
                    name={`${prefix}userViewable`}
                    label={'User Viewable'}
                />

                <Checkbox
                    id={`${prefix}userEditable`}
                    name={`${prefix}userEditable`}
                    label={'User Editable'}
                    css={tw`ml-auto`}
                />
            </div>

            <Field
                id={`${prefix}rules`}
                name={`${prefix}rules`}
                label={'Validation Rules'}
                type={'text'}
                css={tw`mb-2`}
            />
        </>
    );
}

function EggVariableDeleteButton ({ onClick }: { onClick: (success: () => void) => void }) {
    const [ visible, setVisible ] = useState(false);
    const [ loading, setLoading ] = useState(false);

    const onDelete = () => {
        setLoading(true);

        onClick(() => {
            setLoading(false);
        });
    };

    return (
        <>
            <ConfirmationModal
                visible={visible}
                title={'Delete variable?'}
                buttonText={'Yes, delete variable'}
                onConfirmed={onDelete}
                showSpinnerOverlay={loading}
                onModalDismissed={() => setVisible(false)}
            >
                Are you sure you want to delete this variable?  Deleting this variable will delete it from every server
                using this egg.
            </ConfirmationModal>

            <button
                type={'button'}
                css={tw`ml-auto text-neutral-500 hover:text-neutral-300`}
                onClick={() => setVisible(true)}
            >
                <TrashIcon css={tw`h-5 w-5`}/>
            </button>
        </>
    );
}

function EggVariableBox ({ onDeleteClick, variable, prefix }: { onDeleteClick: (success: () => void) => void, variable: EggVariable, prefix: string }) {
    const { isSubmitting } = useFormikContext();

    return (
        <AdminBox
            css={tw`relative w-full`}
            title={<p css={tw`text-sm uppercase`}>{variable.name}</p>}
            button={<EggVariableDeleteButton onClick={onDeleteClick}/>}
        >
            <SpinnerOverlay visible={isSubmitting}/>

            <EggVariableForm prefix={prefix}/>
        </AdminBox>
    );
}

export default function EggVariablesContainer ({ egg }: { egg: Egg }) {
    const { clearAndAddHttpError } = useFlash();

    const { mutate } = getEgg(egg.id);

    const submit = (values: EggVariable[], { setSubmitting }: FormikHelpers<EggVariable[]>) => {
        updateEggVariables(egg.id, values)
            .then(async (variables) => await mutate(egg => ({ ...egg!, relations: { variables: variables } })))
            .catch(error => clearAndAddHttpError({ key: 'egg', error }))
            .then(() => setSubmitting(false));
    };

    return (
        <Formik
            onSubmit={submit}
            initialValues={egg.relations?.variables || []}
            validationSchema={array().of(validationSchema)}
        >
            {({ isSubmitting, isValid }) => (
                <Form>
                    <div css={tw`flex flex-col mb-16`}>
                        {egg.relations?.variables?.length === 0 ?
                            <NoItems css={tw`bg-neutral-700 rounded-md shadow-md`}/>
                            :
                            <div css={tw`grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6`}>
                                {egg.relations?.variables?.map((v, i) => (
                                    <EggVariableBox
                                        key={i}
                                        prefix={`[${i}].`}
                                        variable={v}
                                        onDeleteClick={(success) => {
                                            deleteEggVariable(egg.id, v.id)
                                                .then(async () => {
                                                    await mutate(egg => ({
                                                        ...egg!,
                                                        relations: {
                                                            variables: egg!.relations.variables!.filter(v2 => v.id === v2.id),
                                                        },
                                                    }));
                                                    success();
                                                })
                                                .catch(error => clearAndAddHttpError({ key: 'egg', error }));
                                        }}
                                    />
                                ))}
                            </div>
                        }

                        <div css={tw`bg-neutral-700 rounded shadow-md py-2 px-4 mt-6`}>
                            <div css={tw`flex flex-row`}>
                                <NewVariableButton eggId={egg.id}/>

                                <Button type={'submit'} size={'small'} css={tw`ml-auto`} disabled={isSubmitting || !isValid}>
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                </Form>
            )}
        </Formik>
    );
}
